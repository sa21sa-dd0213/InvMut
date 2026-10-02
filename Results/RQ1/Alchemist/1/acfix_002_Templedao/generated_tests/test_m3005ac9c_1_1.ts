import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m3005ac9c", function () {
  it("should revert when non-owner calls setRewardDistributor", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with a mock staking token (any address) and distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(addr1.address, addr2.address);
    await instance.waitForDeployment();

    // Attempt to call setRewardDistributor from a non-owner address
    // In the original contract, this should revert due to onlyOwner modifier
    // In the mutant, the modifier is removed, so it would succeed
    await expect(
      instance.connect(addr1).setRewardDistributor(addr2.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});