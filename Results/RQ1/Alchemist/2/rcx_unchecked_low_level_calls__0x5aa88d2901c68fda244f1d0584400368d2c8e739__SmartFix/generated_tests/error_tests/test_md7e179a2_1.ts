import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MultiplicatorX3 mutant detection", function () {
  it("should kill mutant md7e179a2 by sending exactly the contract balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const instanceAddress = await instance.getAddress();
    
    // Fund the contract with 2 ETH
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("2")
    });
    
    // Verify initial balance
    expect(await ethers.provider.getBalance(instanceAddress)).to.equal(ethers.parseEther("2"));
    
    // Send exactly 2 ETH to multiplicate - original would trigger, mutant would not
    const tx = await instance.connect(addr1).multiplicate(addr1.address, {
      value: ethers.parseEther("2")
    });
    await tx.wait();
    
    // In original, balance would be 0 after transfer; in mutant, balance remains 2
    // We expect the transfer to happen (original behavior), so balance should be 0
    expect(await ethers.provider.getBalance(instanceAddress)).to.equal(ethers.parseEther("0"));
  });
});