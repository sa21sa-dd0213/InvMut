import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - m416a21d4", function () {
  it("should revert when non-wagering address calls play() in original, but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy with constructor arguments: whaleAddress, wagerLimit
    const betLimit = ethers.parseEther("1.0");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr2.address, betLimit);
    await instance.waitForDeployment();

    // Owner opens the game to public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to a known value for deterministic behavior
    await instance.connect(owner).AdjustDifficulty(10);

    // addr1 wagers properly
    await instance.connect(addr1).wager({ value: betLimit });

    // Now addr2 (who has NOT wagered) tries to call play()
    // In original contract: should revert because wagers[addr2.address] == 0
    // In mutant: should NOT revert because the require check is removed
    await expect(
      instance.connect(addr2).play()
    ).to.be.reverted;
  });
});