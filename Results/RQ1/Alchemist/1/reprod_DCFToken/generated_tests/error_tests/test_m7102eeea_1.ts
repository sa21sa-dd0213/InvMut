import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-cfo calls setDistributeAddress (mutant removal of onlyCaller)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with required constructor argument (liquidityReceiveAddress)
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr2.address);
    await instance.waitForDeployment();
    
    // Set addr1 as the cfo (onlyOwner function)
    await instance.connect(owner).setCaller(addr1.address);
    
    // Attempt to call setDistributeAddress from an unauthorized address (addr2)
    // In the original contract, this should revert with "onlyCaller"
    // In the mutant (where onlyCaller modifier is removed), this will succeed
    await expect(
      instance.connect(addr2).setDistributeAddress(addr2.address)
    ).to.be.revertedWith("onlyCaller");
  });
});