import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection", function () {
  it("should detect mutant mfd372852 by sending more than contract balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with 1 ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    const addr2BalanceBefore = await ethers.provider.getBalance(addr2.address);
    
    // Send 2 ETH which is strictly greater than the contract balance of 1 ETH
    const tx = await instance.connect(owner).multiplicate(addr2.address, {
      value: ethers.parseEther("2")
    });
    await tx.wait();
    
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    const addr2BalanceAfter = await ethers.provider.getBalance(addr2.address);
    
    // In the original, the entire balance (1 + 2 = 3 ETH) should be transferred to addr2
    // In the mutant, the condition msg.value == address(this).balance fails (2 != 1), so no transfer occurs
    expect(addr2BalanceAfter - addr2BalanceBefore).to.equal(ethers.parseEther("3"));
    expect(contractBalanceAfter).to.equal(0);
  });
});