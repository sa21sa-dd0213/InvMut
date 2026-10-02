import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test m35c8952e", function () {
  it("should detect mutant that adds 1 wei to transfer amount", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy contract - no constructor arguments needed
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund contract with 1 ether from owner
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1.0")
    });

    // Check initial balance
    const initialContractBalance = await ethers.provider.getBalance(contractAddress);
    expect(initialContractBalance).to.equal(ethers.parseEther("1.0"));

    // addr1 starts with 0 balance for simplicity
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
    expect(addr1BalanceBefore).to.equal(0n);

    // Call multiplicate with msg.value equal to current contract balance (1 ether)
    // Original: transfers address(this).balance + msg.value = 1 + 1 = 2 ether
    // Mutant: transfers address(this).balance + msg.value + 1 = 1 + 1 + 1 wei = 2 ether + 1 wei
    // Mutant will try to send more than contract balance (which is 1 + 1 = 2 ether after receive)
    // This should revert in mutant due to insufficient balance
    const tx = instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("1.0")
    });

    // The original should succeed, the mutant should revert
    await expect(tx).to.be.reverted;
  });
});