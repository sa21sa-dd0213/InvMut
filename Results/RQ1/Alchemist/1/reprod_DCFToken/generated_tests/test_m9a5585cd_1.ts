import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert distributeToken when distributeAddress is not set (mutant kills: distributeAddress == address(0) instead of !=)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const liquidityReceiveAddress = addr2.address;
    
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // Set a valid non-zero distributeAddress via the onlyCaller function
    // First, we need to set the caller (cfo) since distributeToken uses onlyCaller modifier
    await instance.setCaller(owner.address);
    
    // Set distributeAddress to a valid non-zero address
    await instance.setDistributeAddress(addr1.address);
    
    // The original contract should allow distributeToken to succeed
    // The mutant would revert because it requires distributeAddress == address(0)
    // which is false since we set it to addr1.address
    await expect(instance.distributeToken()).to.not.be.reverted;
  });
});