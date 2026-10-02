import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m337c65e6 - kill test", function () {
  it("should detect mutant that changes win condition from == to <=", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const difficulty = 10;

    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    await (await instance.connect(owner).OpenToThePublic()).wait();
    await (await instance.connect(owner).AdjustDifficulty(difficulty)).wait();
    await (await instance.connect(player).wager({ value: betLimit })).wait();
    await ethers.provider.send("evm_mine", []);

    const Factory2 = await ethers.getContractFactory("PoCGame");
    const instance2 = await Factory2.deploy(whale.address, betLimit);
    await instance2.waitForDeployment();
    await (await instance2.connect(owner).OpenToThePublic()).wait();
    await (await instance2.connect(owner).AdjustDifficulty(2)).wait();
    await (await instance2.connect(player).wager({ value: betLimit })).wait();
    await ethers.provider.send("evm_mine", []);

    const Factory3 = await ethers.getContractFactory("PoCGame");
    const instance3 = await Factory3.deploy(whale.address, betLimit);
    await instance3.waitForDeployment();
    await (await instance3.connect(owner).OpenToThePublic()).wait();
    await (await instance3.connect(owner).AdjustDifficulty(4)).wait();

    let found = false;
    let attempts = 0;
    while (!found && attempts < 20) {
      const tempPlayer = (await ethers.getSigners())[3 + attempts];
      await (await instance3.connect(tempPlayer).wager({ value: betLimit })).wait();
      await ethers.provider.send("evm_mine", []);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber - 1);
      const blockHash = block.hash;
      const winningNumber = (BigInt(blockHash) % 4n) + 1n;

      if (winningNumber === 1n) {
        found = true;
        const tx = instance3.connect(tempPlayer).play();
        await expect(tx).to.not.be.reverted;

        const balanceAfter = await ethers.provider.getBalance(instance3.target);
        expect(balanceAfter).to.be.lessThan(ethers.parseEther("1"));
      }
      attempts++;
    }
    expect(found).to.be.true;
  });
});