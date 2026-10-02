import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mda340d38 test", function () {
  it("should fail when block.number % 15 != 0 and contract balance remains unchanged", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with 10 ether from addr1
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Wait for a block where block.number % 15 != 0
    const initialBlock = await ethers.provider.getBlockNumber();
    let targetBlock = initialBlock;
    while (targetBlock % 15 === 0) {
      await ethers.provider.send("evm_mine", []);
      targetBlock = await ethers.provider.getBlockNumber();
    }
    
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // Call fallback from same address again - should NOT trigger payout in original
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    
    // In original: payout only when block.number % 15 == 0, so balance should increase by 10 ether
    // In mutant: payout always happens, so balance would drop to ~10 ether (minus transfer costs)
    expect(contractBalanceAfter).to.equal(contractBalanceBefore + ethers.parseEther("10"));
  });
});