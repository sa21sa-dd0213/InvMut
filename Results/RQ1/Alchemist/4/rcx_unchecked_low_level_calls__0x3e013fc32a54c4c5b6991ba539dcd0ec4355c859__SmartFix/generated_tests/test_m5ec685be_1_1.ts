import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - kill mutant m5ec685be", function () {
  it("should NOT transfer when msg.value is exactly 1 wei less than contract balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with 2 ether
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("2")
    });

    const contractBalanceBefore = await ethers.provider.getBalance(contractAddress);
    // Contract balance is exactly 2 ether
    // Send 2 ether - 1 wei as msg.value
    const msgValue = ethers.parseEther("2") - 1n;

    // Get initial balance of addr2 (recipient)
    const addr2BalanceBefore = await ethers.provider.getBalance(addr2.address);

    // Call multiplicate with msg.value = 2 ether - 1 wei
    // Original condition: msg.value >= address(this).balance -> false (2e18-1 < 2e18)
    // Mutant condition: msg.value+1 >= address(this).balance -> true (2e18 >= 2e18)
    await instance.connect(owner).multiplicate(addr2.address, { value: msgValue });

    const contractBalanceAfter = await ethers.provider.getBalance(contractAddress);
    const addr2BalanceAfter = await ethers.provider.getBalance(addr2.address);

    // If original behavior (should pass): no transfer occurred
    // If mutant behavior (should fail): transfer occurred, addr2 got all contract balance
    expect(contractBalanceAfter).to.equal(contractBalanceBefore);
    expect(addr2BalanceAfter).to.equal(addr2BalanceBefore);
  });
});