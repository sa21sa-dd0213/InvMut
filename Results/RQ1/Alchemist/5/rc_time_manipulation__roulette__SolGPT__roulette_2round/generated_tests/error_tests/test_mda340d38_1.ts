import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - mda340d38", function () {
  it("should not send balance when block.number is not divisible by 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first
    const fundAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);
    const contractAddress = await instance.getAddress();
    const initialContractBalance = await ethers.provider.getBalance(contractAddress);

    // Ensure current block number is NOT divisible by 15
    const currentBlock = await ethers.provider.getBlock("latest");
    const targetBlockNumber = currentBlock!.number + 1;
    
    // If the next block would be divisible by 15, mine one more block
    if (targetBlockNumber % 15 === 0) {
      await ethers.provider.send("evm_mine", []);
    }

    // Send 10 ether to trigger fallback
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Verify addr1's balance hasn't changed (no payout occurred)
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    // Subtract the 10 ether they sent to get comparable balance
    const adjustedInitial = initialBalance - ethers.parseEther("10");
    expect(finalBalance).to.equal(adjustedInitial);

    // Verify contract balance remains unchanged (no transfer out)
    const finalContractBalance = await ethers.provider.getBalance(contractAddress);
    expect(finalContractBalance).to.equal(initialContractBalance + ethers.parseEther("10"));
  });
});