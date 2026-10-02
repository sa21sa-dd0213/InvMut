import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - mda340d38", function () {
  it("should detect mutant that always pays out (if(true) instead of block.number % 15 == 0)", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy the contract (constructor is payable but takes no arguments)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with initial balance for gas purposes
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });

    // Record balance before first call
    const balanceBeforeFirstCall = await ethers.provider.getBalance(contractAddress);

    // First call: send 10 ether (this should succeed in both original and mutant)
    const tx1 = await player.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Record balance after first call
    const balanceAfterFirstCall = await ethers.provider.getBalance(contractAddress);

    // Second call: send another 10 ether
    const tx2 = await player.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx2.wait();

    // Get final balance
    const finalBalance = await ethers.provider.getBalance(contractAddress);

    // In the original contract, the second call would NOT trigger payout (since block.number hasn't advanced 15 blocks)
    // So the balance should be > 0 (initial 10 + 10 + 10 - first payout if block condition met)
    // In the mutant, the second call ALSO triggers payout, emptying the contract
    // So finalBalance should be 0 in the mutant

    // To kill the mutant, we assert that the balance is NOT zero after two consecutive calls
    expect(finalBalance).to.not.equal(0);
  });
});