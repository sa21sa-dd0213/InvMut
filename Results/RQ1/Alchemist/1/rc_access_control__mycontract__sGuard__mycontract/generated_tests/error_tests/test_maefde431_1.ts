import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant test - access control removal", function () {
  it("should revert when non-owner calls sendTo (original behavior)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy contract (constructor takes no arguments)
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Non-owner (addr1) attempts to send ether from contract to addr2
    // Original contract should revert; mutant should allow it
    await expect(
      instance.connect(addr1).sendTo(addr2.address, ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});