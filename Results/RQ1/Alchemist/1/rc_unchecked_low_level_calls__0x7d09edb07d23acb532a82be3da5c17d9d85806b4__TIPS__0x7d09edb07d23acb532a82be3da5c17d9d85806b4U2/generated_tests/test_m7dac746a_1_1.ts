import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m7dac746a test", function () {
  it("should kill mutant by proving play() fails when it should succeed after a new block", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy with constructor arguments: whaleAddress, wagerLimit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr1.address, betLimit);
    await instance.waitForDeployment();

    // Open the contract to the public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty so we know the expected behavior
    const difficulty = 10;
    await instance.connect(owner).AdjustDifficulty(difficulty);

    // Player addr2 places a wager
    await instance.connect(addr2).wager({ value: betLimit });

    // Mine a new block so block.number > blockNumber stored for addr2
    await ethers.provider.send("evm_mine", []);

    // Now call play() - should succeed in original, but mutant will revert
    // In original: condition blockNumber < block.number is true, so execution proceeds
    // In mutant: condition is false, so it reverts with no reason string
    await expect(
      instance.connect(addr2).play()
    ).to.not.be.reverted;
  });
});