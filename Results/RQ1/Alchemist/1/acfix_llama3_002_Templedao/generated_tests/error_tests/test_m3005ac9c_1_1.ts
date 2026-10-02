import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m3005ac9c - setRewardDistributor access control", function () {
  it("should revert when non-owner calls setRewardDistributor on original contract, but allow it on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy with a mock staking token address (any valid address works for constructor)
    const mockToken = addr1.address;
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(mockToken, owner.address);
    await instance.waitForDeployment();

    // Attempt to call setRewardDistributor from a non-owner address
    // This should revert on the original contract due to onlyOwner modifier
    // On the mutant (which removes the modifier), it will succeed
    await expect(
      instance.connect(addr2).setRewardDistributor(addr2.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});