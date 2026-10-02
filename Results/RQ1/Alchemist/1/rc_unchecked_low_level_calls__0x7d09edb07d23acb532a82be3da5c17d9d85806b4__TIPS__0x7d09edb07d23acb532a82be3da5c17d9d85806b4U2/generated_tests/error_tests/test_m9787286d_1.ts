import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m9787286d test", function () {
  it("should revert when calling wager() before contract is open to public", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = owner.address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Attempt to call wager() before openToPublic is set to true
    // In the original contract, this should revert due to isOpenToPublic modifier
    // In the mutant, it would succeed (which is incorrect behavior)
    await expect(
      instance.connect(addr1).wager({ value: wagerLimit })
    ).to.be.reverted;
  });
});