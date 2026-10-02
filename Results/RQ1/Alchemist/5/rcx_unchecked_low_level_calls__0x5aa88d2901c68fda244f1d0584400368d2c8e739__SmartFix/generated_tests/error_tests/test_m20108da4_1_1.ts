import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test", function () {
  it("should detect mutant m20108da4 by sending msg.value equal to contract balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund contract with 1 ether
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1")
    });

    const initialBalance = await ethers.provider.getBalance(contractAddress);
    expect(initialBalance).to.equal(ethers.parseEther("1"));

    // Get recipient's balance before
    const recipientBefore = await ethers.provider.getBalance(addr1.address);

    // Send exactly the contract balance (1 ether) to multiplicate
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("1")
    });
    await tx.wait();

    // Original: should transfer (contract balance + msg.value) = 2 ether to addr1
    // Mutant: condition fails (1-1 >= 1 is false), no transfer happens
    const recipientAfter = await ethers.provider.getBalance(addr1.address);

    // If mutant is alive, no transfer occurs, recipient balance unchanged
    // If original, recipient gains 2 ether
    expect(recipientAfter).to.not.equal(recipientBefore);
  });
});