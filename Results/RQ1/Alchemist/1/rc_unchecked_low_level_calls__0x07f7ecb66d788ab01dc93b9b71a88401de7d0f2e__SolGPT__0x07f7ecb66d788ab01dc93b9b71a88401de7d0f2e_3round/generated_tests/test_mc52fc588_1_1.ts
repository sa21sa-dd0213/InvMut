import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mc52fc588 - AdjustDifficulty without onlyOwner modifier", function () {
  let instance: any;
  let owner: any;
  let nonOwner: any;

  beforeEach(async function () {
    const [signer1, signer2] = await ethers.getSigners();
    owner = signer1;
    nonOwner = signer2;

    const Factory = await ethers.getContractFactory("PoCGame");
    // Deploy with constructor arguments: whaleAddress, wagerLimit
    instance = await Factory.deploy(nonOwner.address, ethers.parseEther("1"));
    await instance.waitForDeployment();
  });

  it("should revert when non-owner calls AdjustDifficulty due to onlyOwner modifier", async function () {
    // Attempt to call AdjustDifficulty from a non-owner address
    await expect(
      instance.connect(nonOwner).AdjustDifficulty(5)
    ).to.be.reverted;
  });

  it("should allow owner to call AdjustDifficulty and emit event", async function () {
    const newDifficulty = 10;
    await expect(
      instance.connect(owner).AdjustDifficulty(newDifficulty)
    ).to.emit(instance, "DifficultyChanged").withArgs(newDifficulty);
    
    // Verify the difficulty was actually changed
    expect(await instance.currentDifficulty()).to.equal(newDifficulty);
  });
});