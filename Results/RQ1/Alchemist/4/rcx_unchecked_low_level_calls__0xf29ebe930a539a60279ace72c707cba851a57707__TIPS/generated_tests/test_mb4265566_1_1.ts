import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant mb4265566 detection test", function () {
  it("should kill mutant by verifying owner receives funds after sending Ether to go()", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance (e.g., from addr1 via fallback)
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Get owner's balance before calling go()
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

    // Call go() from owner, sending 0.5 Ether (this Ether should be forwarded to target)
    const tx = await instance.connect(owner).go({ value: ethers.parseEther("0.5") });
    await tx.wait();

    // Get owner's balance after
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

    // Original behavior: 0.5 Ether sent to target, target forwards nothing back,
    // then contract transfers its full balance (1.0 initial + 0.5 sent - 0.5 forwarded = 1.0) to owner
    // So owner balance increases by ~1.0 Ether (minus gas)
    // Mutant behavior: 0.5 Ether sent to address(0) and lost,
    // then contract transfers its full balance (1.0 initial) to owner
    // So owner balance increases by ~1.0 Ether as well - but the key difference:
    // In the original, the 0.5 Ether was forwarded to the hardcoded address (not lost)
    // In the mutant, the 0.5 Ether is burned at address(0)
    // To detect this, we check the balance of the hardcoded target address
    const hardcodedTarget = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    const targetBalance = await ethers.provider.getBalance(hardcodedTarget);
    
    // In the original contract, target should have received 0.5 Ether
    // In the mutant, target receives nothing (since address(0) is used instead)
    expect(targetBalance).to.equal(ethers.parseEther("0.5"));

    // Additionally, verify owner did receive the contract's balance
    const ownerReceived = ownerBalanceAfter - ownerBalanceBefore;
    expect(ownerReceived).to.be.gt(ethers.parseEther("0.9")); // should get ~1.0 Ether
  });
});