import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection - m319c0e32", function () {
  it("should kill mutant that adds 1 to msg.value in multiplicate function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 1 ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const initialRecipientBalance = await ethers.provider.getBalance(addr1.address);

    // Send exactly contract balance (1 ether) to trigger multiplicate
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // Expected: original would send 2 ether (1 contract + 1 msg.value)
    // Mutant tries to send 2 ether + 1 wei, which should revert
    const finalRecipientBalance = await ethers.provider.getBalance(addr1.address);
    const expectedTransfer = ethers.parseEther("2.0");

    // If mutant survived, recipient would have received exactly 2 ether
    // If mutant was killed, transaction reverted and recipient balance unchanged
    expect(finalRecipientBalance - initialRecipientBalance).to.equal(expectedTransfer);
  });
});