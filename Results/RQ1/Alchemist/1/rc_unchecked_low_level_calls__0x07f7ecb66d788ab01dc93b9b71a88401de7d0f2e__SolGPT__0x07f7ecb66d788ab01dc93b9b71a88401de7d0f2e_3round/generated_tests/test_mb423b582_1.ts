import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mb423b582 detection", function () {
  it("should detect the mutant by reverting when blockNumber < block.number (normal case)", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy with constructor arguments: whaleAddress, wagerLimit
    const betLimit = ethers.parseEther("1.0");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(owner.address, betLimit);
    await instance.waitForDeployment();

    // Owner opens the game to public
    await (await instance.OpenToThePublic()).wait();

    // Player makes a wager with exactly betLimit
    await (await instance.connect(player).wager({ value: betLimit })).wait();

    // Mine a new block so block.number > player's timestamp block
    await ethers.provider.send("evm_mine", []);

    // Attempt to play - should succeed on original but revert on mutant
    // The mutant changes < to >, so the condition blockNumber > block.number is false
    // and the else branch reverts
    await expect(instance.connect(player).play()).to.be.reverted;
  });
});