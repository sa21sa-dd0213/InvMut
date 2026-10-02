import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - md8ca3c8d", function () {
  it("should revert when calling play() in the same block as wager() (original behavior) - mutant fails this test", async function () {
    const [owner, player] = await ethers.getSigners();
    const whaleAddress = owner.address;
    const wagerLimit = ethers.parseEther("1");

    // Deploy contract with constructor arguments: whaleAddress, wagerLimit
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Owner opens the contract to public
    await (await instance.connect(owner).OpenToThePublic()).wait();

    // Player sends wager
    await (await instance.connect(player).wager({ value: wagerLimit })).wait();

    // Attempt to play in the same block - should revert in original contract
    // because blockNumber (stored block) equals current block.number
    // The mutant changes condition to blockNumber < block.number + 1 which would pass
    await expect(
      instance.connect(player).play()
    ).to.be.reverted;
  });
});