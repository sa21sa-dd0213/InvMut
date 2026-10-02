import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - mda340d38", function () {
  it("should not transfer balance when block.number is not divisible by 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const contractAddress = await instance.getAddress();
    
    // Send 10 ether to the contract from addr1
    const tx = await addr1.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();
    
    // Get contract balance after first deposit
    const balanceAfterDeposit = await ethers.provider.getBalance(contractAddress);
    expect(balanceAfterDeposit).to.equal(ethers.parseEther("10"));
    
    // Now we need to ensure the next call happens on a block where block.number % 15 != 0
    // Mine blocks until we find a suitable block number
    let currentBlock = await ethers.provider.getBlockNumber();
    
    // If current block number is divisible by 15, mine one more block
    if (currentBlock % 15 === 0) {
      await ethers.provider.send("evm_mine", []);
      currentBlock = await ethers.provider.getBlockNumber();
    }
    
    // Send another 10 ether from addr1 on a block where %15 != 0
    const tx2 = await addr1.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx2.wait();
    
    // Check block number of the transaction
    const receipt = await tx2.getBlock();
    
    // If block.number % 15 != 0, the contract should NOT transfer balance
    // In the original, balance should be 20 ether (no transfer)
    // In the mutant, balance would be 0 (transferred everything)
    if (receipt.number % 15 !== 0) {
      const finalBalance = await ethers.provider.getBalance(contractAddress);
      expect(finalBalance).to.equal(ethers.parseEther("20"));
    }
  });
});