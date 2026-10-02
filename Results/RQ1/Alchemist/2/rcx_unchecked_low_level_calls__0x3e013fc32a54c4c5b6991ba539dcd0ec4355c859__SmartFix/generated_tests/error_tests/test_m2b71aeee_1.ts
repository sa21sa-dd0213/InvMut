import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection", function () {
  it("should kill mutant m2b71aeee by detecting multiplication instead of addition in multiplicate", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with 1 ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const initialRecipientBalance = await ethers.provider.getBalance(addr1.address);
    
    // Call multiplicate with 1 ETH - original would send 2 ETH, mutant sends 1 ETH
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("1")
    });
    await tx.wait();
    
    // Check recipient's balance change
    const finalRecipientBalance = await ethers.provider.getBalance(addr1.address);
    const transferredAmount = finalRecipientBalance - initialRecipientBalance;
    
    // If mutation is present, transferredAmount = 1 ETH (contract balance * msg.value = 1 * 1 = 1)
    // If original code, transferredAmount = 2 ETH (contract balance + msg.value = 1 + 1 = 2)
    expect(transferredAmount).to.equal(ethers.parseEther("2"));
  });
});