import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Roulette mutant kill test - mda340d38", function () {
  it("should not payout when block.number is not a multiple of 15", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Ensure we are on a block that is NOT a multiple of 15
    const blockNumberBefore = await ethers.provider.getBlockNumber();
    const targetBlock = blockNumberBefore % 15 === 0 ? blockNumberBefore + 1 : blockNumberBefore;
    
    // If needed, mine to a block that is not a multiple of 15
    if (blockNumberBefore % 15 === 0) {
      await ethers.provider.send("hardhat_mine", ["0x1"]);
    }

    // Record player balance before
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Send exactly 10 ether to trigger fallback
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check that player balance did NOT increase (no payout)
    const balanceAfter = await ethers.provider.getBalance(player.address);
    
    // Player should have lost 10 ether (plus gas) - no payout received
    expect(balanceAfter).to.be.lessThan(balanceBefore);
    expect(balanceBefore - balanceAfter).to.be.closeTo(
      ethers.parseEther("10"),
      ethers.parseEther("0.01") // Allow for gas costs
    );
  });
});