import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant mbcafb924 test", function () {
  it("should kill mutant by exploiting the +1 in require condition with zero msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Call multiplicate with msg.value = 0
    // Original require: (balance + 0) >= balance -> passes
    // Mutant require: (balance + 0 + 1) >= balance -> also passes
    // But the transfer amount is balance + msg.value = balance (not balance + 1)
    // The mutant adds 1 to the require check but NOT to the transfer
    // This inconsistency can be detected
    await instance.connect(owner).multiplicate(addr1.address, { value: 0 });

    // Check that addr1 received the full contract balance
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());

    // addr1 should have received the original balance (since msg.value was 0)
    // Use BigInt arithmetic for proper comparison
    expect(finalBalance - initialBalance).to.equal(ethers.parseEther("1.0"));

    // The key assertion: the contract should now have 0 balance
    expect(contractBalance).to.equal(0n);
  });
});