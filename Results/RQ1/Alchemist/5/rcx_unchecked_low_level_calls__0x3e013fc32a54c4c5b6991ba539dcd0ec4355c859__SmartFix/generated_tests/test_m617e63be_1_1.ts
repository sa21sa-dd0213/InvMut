import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 reference (ethers v6)", function () {
  it("should kill mutant m617e63be by testing msg.value > address(this).balance scenario", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(ethers.parseEther("10"));

    // Send value GREATER than contract balance (should work in original, fail in mutant)
    const sendValue = ethers.parseEther("15"); // 15 > 10
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);

    await instance.connect(owner).multiplicate(addr1.address, { value: sendValue });

    // In original: condition msg.value >= address(this).balance is true (15 >= 10)
    // Contract sends its entire balance (10 + 15 = 25) to addr1
    // In mutant: condition msg.value <= address(this).balance is false (15 <= 10 is false)
    // So addr1 should NOT receive the funds in mutant

    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // In original: addr1 received 25 ETH, contract balance becomes 0
    // In mutant: addr1 received nothing, contract balance remains 25 (original 10 + sent 15)
    // This assertion kills the mutant because it will fail when mutant is active
    expect(addr1BalanceAfter - addr1BalanceBefore).to.equal(ethers.parseEther("25"));
    expect(contractBalanceAfter).to.equal(0n);
  });
});