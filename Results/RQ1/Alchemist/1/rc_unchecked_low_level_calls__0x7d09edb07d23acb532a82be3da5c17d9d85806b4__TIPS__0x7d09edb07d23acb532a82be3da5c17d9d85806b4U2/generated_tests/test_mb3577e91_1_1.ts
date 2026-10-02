import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mb3577e91 - whale address zero", function () {
  it("should detect mutant by verifying whale receives lost wager", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");

    // Deploy contract with a valid whale address
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Open contract to public
    await instance.connect(owner).OpenToThePublic();

    // Player makes a wager
    const wagerTx = await instance.connect(player).wager({ value: betLimit });
    await wagerTx.wait();

    // Record whale balance before play
    const whaleBalanceBefore = await ethers.provider.getBalance(whale.address);

    // Advance one block so block.number > timestamps[player]
    await ethers.provider.send("evm_mine", []);

    // Player plays and loses (winningNumber will not equal difficulty/2 with difficulty=0 default)
    await instance.connect(player).play();

    // Check whale balance after play
    const whaleBalanceAfter = await ethers.provider.getBalance(whale.address);
    const lostAmount = betLimit / 2n; // betLimit / 2 as defined in loseWager

    // In original: whale receives lostAmount. In mutant: whale receives nothing.
    expect(whaleBalanceAfter - whaleBalanceBefore).to.equal(lostAmount);
  });
});