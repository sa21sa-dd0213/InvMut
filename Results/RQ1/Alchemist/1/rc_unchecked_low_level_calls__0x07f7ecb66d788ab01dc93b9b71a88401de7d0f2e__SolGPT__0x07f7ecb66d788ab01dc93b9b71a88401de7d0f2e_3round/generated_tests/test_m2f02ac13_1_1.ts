import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m2f02ac13 test", function () {
  it("should revert when wager and play are called in the same block (original behavior) - mutant allows this and should fail", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy contract with constructor arguments: whale address and bet limit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(owner.address, betLimit);
    await instance.waitForDeployment();

    // Open the contract to the public
    await (await instance.connect(owner).OpenToThePublic()).wait();

    // Player sends wager
    await (await instance.connect(player).wager({ value: betLimit })).wait();

    // Immediately try to play in the same block - this should revert in the original,
    // but the mutant allows it (<= instead of <), so if it does NOT revert, the mutant is detected
    await expect(
      instance.connect(player).play()
    ).to.be.reverted;
  });
});