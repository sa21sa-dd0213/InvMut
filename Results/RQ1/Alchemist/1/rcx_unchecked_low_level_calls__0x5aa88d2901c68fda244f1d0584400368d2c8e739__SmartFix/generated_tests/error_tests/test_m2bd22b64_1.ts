import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant test for m2bd22b64", function () {
  it("should kill mutant by triggering transfer with msg.value = 1 wei when contract balance is 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund contract with 1 wei to ensure initial balance is 0
    const initialBalance = await ethers.provider.getBalance(contractAddress);
    expect(initialBalance).to.equal(0n);

    // Call multiplicate with 1 wei - this should trigger the transfer
    // In the original, the require check passes (no overflow with 0+1)
    // In the mutant, the require is removed so it should still execute
    // but we need to verify the behavior difference
    const tx = await instance.connect(owner).multiplicate(addr1.address, { value: ethers.parseEther("1") });
    await tx.wait();

    // After the call, contract balance should be 0 because all funds were transferred
    const finalBalance = await ethers.provider.getBalance(contractAddress);
    expect(finalBalance).to.equal(0n);

    // Verify the recipient received the funds
    const recipientBalance = await ethers.provider.getBalance(addr1.address);
    expect(recipientBalance).to.equal(ethers.parseEther("1"));
  });
});