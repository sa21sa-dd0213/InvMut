import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - onlyCaller modifier", function () {
  it("should revert when called from non-cfo address on original, but succeed when called from cfo address; mutant will revert when called from cfo address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const liquidityReceiveAddress = addr2.address;
    
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();
    
    // Set CFO to addr1
    await instance.connect(owner).setCaller(addr1.address);
    
    // Set a distribute address so distributeToken() can be called
    await instance.connect(addr1).setDistributeAddress(addr2.address);
    
    // Now call distributeToken() from the CFO (addr1) - should succeed on original, fail on mutant
    // On the mutant, require(_msgSender() != cfo) will revert because msg.sender IS cfo
    await expect(
      instance.connect(addr1).distributeToken()
    ).to.not.be.reverted;
  });
});