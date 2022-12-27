const observeQuestions = () => {
  return new Promise((resolve) => {
    const widget = document.querySelector('[data-widget="webListQuestions"]');

    if (!widget.children.length) {
      return resolve(null);
    }

    new MutationObserver((_, observer) => {
      const showAnswers = widget.querySelector(':scope > :last-child button');

      if (widget.querySelector(':scope > :last-child').hasAttribute('data-question-id')) {
        observer.disconnect();
        console.log('Questions have been loaded. Observer was disconnected.');
        const questions = document.querySelectorAll('[data-question-id]');
        return resolve(questions);
      } else if (showAnswers) {
        showAnswers.click();
      }
    }).observe(widget, {
      childList: true,
      subtree: true,
    });

    if (widget.querySelector(':scope > :last-child').hasAttribute('data-question-id')) {
      const questions = document.querySelectorAll('[data-question-id]');
      return resolve(questions);
    }

    const showAnswers = widget.querySelector(':scope > :last-child button');

    if (showAnswers) {
      showAnswers.click();
    }
  });
};

const observeAnswers = (question) => {
  return new Promise((resolve) => {
    const answers = question.querySelector(':scope > :last-child');

    if (answers.children.length > 1) {
      new MutationObserver((_, observer) => {
        observer.disconnect();
        console.log('Answers have been loaded. Observer was disconnected.');
        resolve(question);
      }).observe(question, {
        childList: true,
        subtree: true,
      });

      const btn = question.querySelector(
        ':scope > :last-child > :last-child button'
      );
      btn.click();
    } else {
      console.log('Nothing to observe because there is nothing to load.');
      return resolve(question);
    }
  });
};

const normalizeDate = (date) => {
  let [day, month, year] = date.toLowerCase().split(' ');
  const months = {
    января: '01',
    февраля: '02',
    марта: '03',
    апреля: '04',
    мая: '05',
    июня: '06',
    июля: '07',
    августа: '08',
    сентября: '09',
    октября: '10',
    ноября: '11',
    декабря: '12',
  };

  if (day.length === 1) {
    day = 0 + day;
  }

  return `${year}.${months[month]}.${day}`;
};

const parseAnswers = (answers) => {
  return Array.from(answers, (answer) => {
    const id = answer.getAttribute('data-answer-id');
    const author = answer.querySelector(':first-child + div');
    const date = answer.querySelector(':scope > div > div > :nth-child(2)');
    const likes = answer.querySelector(':scope > div :first-child > button');
    const dislikes = answer.querySelector(':scope > div :last-child > button');
    const content = answer.querySelector(
      ':scope > div > :last-child > :nth-last-child(2)'
    );

    return {
      id: id,
      author: author.textContent.trim(),
      date: normalizeDate(date.textContent),
      likes: +likes.textContent.replace(/\D/g, ''),
      dislikes: +dislikes.textContent.replace(/\D/g, ''),
      content: content.textContent,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
};

const parseQA = (questions) => {
  return Array.from(questions, (question) => {
    const id = question.getAttribute('data-question-id');
    const content = question.querySelector(
      ':nth-child(2) > :last-child > :first-child'
    );
    const date = question.querySelector('a + div');
    const author = question.querySelector(
      ':nth-child(2) > :last-child > :nth-child(2)'
    );
    const likes = question.querySelector(':nth-child(2) > :last-child span');
    const answers = question.querySelectorAll('[data-answer-id]');

    return {
      id: id,
      content: content.textContent,
      date: normalizeDate(date.textContent),
      author: author.textContent,
      likes: +likes.textContent,
      answers: answers.length > 0 ? parseAnswers(answers) : null,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
};

const main = async () => {
  console.log('Loading questions...');
  const questions = await observeQuestions();

  if (!questions) {
    console.log('Done. There are not any questions.');
    return null;
  }

  const stash = [];
  console.log('Loading answers...');

  for (const question of questions) {
    stash.push(await observeAnswers(question));
  }

  console.log('Done.');
  return parseQA(stash);
};
