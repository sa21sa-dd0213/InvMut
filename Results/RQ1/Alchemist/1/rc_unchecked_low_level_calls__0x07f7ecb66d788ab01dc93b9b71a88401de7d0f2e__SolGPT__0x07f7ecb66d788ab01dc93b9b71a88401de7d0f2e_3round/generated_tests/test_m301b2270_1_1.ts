import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m301b2270", function () {
  it("should kill the mutant by calling play() after the required block delay and expecting success (not revert)", async function () {
    const [owner, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const whaleAddress = ethers.Wallet.createRandom().address;
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();

    // Open to public
    await (await instance.connect(owner).OpenToThePublic()).wait();

    // Set difficulty to a value that makes difficulty/2 valid (e.g., 10)
    await (await instance.connect(owner).AdjustDifficulty(10)).wait();

    // Player wagers
    await (await instance.connect(player).wager({ value: betLimit })).wait();

    // Mine a block to ensure blockNumber < block.number after wager
    await ethers.provider.send("evm_mine", []);

    // This call should succeed on original but revert on mutant
    // The mutant will always revert because condition is replaced with false
    await expect(instance.connect(player).play()).to.not.be.reverted;
  });
});