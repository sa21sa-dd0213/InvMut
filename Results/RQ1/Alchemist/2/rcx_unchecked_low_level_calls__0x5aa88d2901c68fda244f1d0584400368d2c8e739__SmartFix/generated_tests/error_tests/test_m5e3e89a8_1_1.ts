import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test - m5e3e89a8", function () {
  it("should not drain contract with small msg.value when contract has larger balance (original behavior), but mutant would drain", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with 10 ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Verify initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(ethers.parseEther("10"));
    
    // Send 1 wei (small amount) to multiplicate, expecting it should NOT transfer full balance
    // because msg.value (1 wei) < address(this).balance (10 ether)
    await expect(
      instance.connect(addr1).multiplicate(addr2.address, { value: 1 })
    ).to.not.changeEtherBalance(addr2, ethers.parseEther("10"));
    
    // Verify contract balance remains unchanged (original contract behavior)
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalBalance).to.equal(ethers.parseEther("10"));
  });
});