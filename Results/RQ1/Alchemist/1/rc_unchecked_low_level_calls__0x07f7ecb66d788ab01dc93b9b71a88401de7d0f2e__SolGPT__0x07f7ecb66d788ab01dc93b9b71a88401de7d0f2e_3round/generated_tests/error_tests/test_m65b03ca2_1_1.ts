import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m65b03ca2 test", function () {
  it("should kill mutant by verifying that only exact winning number triggers payout (not <=)", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy with constructor arguments: whaleAddress, wagerLimit
    const whaleAddress = ethers.Wallet.createRandom().address;
    const wagerLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await instance.connect(owner).OpenToThePublic();
    
    // Set difficulty to 10 so difficulty/2 = 5
    await instance.connect(owner).AdjustDifficulty(10);
    
    // Player wagers exactly betLimit (1 ether)
    await instance.connect(player).wager({ value: wagerLimit });
    
    // We need to advance one block so that block.number > timestamps[player]
    await ethers.provider.send("evm_mine", []);
    
    // Now play
    const tx = await instance.connect(player).play();
    const receipt = await tx.wait();
    
    // Calculate gas cost
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    
    const balanceAfter = await ethers.provider.getBalance(instance.target);
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    
    const playerNetChange = playerBalanceAfter - (await ethers.provider.getBalance(player.address) - gasCost) + gasCost;
    
    // Check if player won (balance increased significantly)
    if (playerNetChange > ethers.parseEther("0.1")) {
      // Player received payout - verify it equals half the contract balance
      const winnersPot = await instance.winnersPot();
      expect(playerNetChange).to.equal(winnersPot);
    }
    
    // Statistical test to kill mutant: run many games and check win rate
    const Factory2 = await ethers.getContractFactory("PoCGame");
    const instance2 = await Factory2.deploy(whaleAddress, wagerLimit);
    await instance2.waitForDeployment();
    await instance2.connect(owner).OpenToThePublic();
    await instance2.connect(owner).AdjustDifficulty(100); // 1% win chance in original
    await owner.sendTransaction({ to: instance2.target, value: ethers.parseEther("100") });
    
    let winCount = 0;
    const totalGames = 50;
    const signers = await ethers.getSigners();
    
    for (let i = 0; i < totalGames; i++) {
      const currentPlayer = signers[(i + 2) % signers.length];
      
      const hasWagered = await instance2.hasPlayerWagered(currentPlayer.address);
      if (hasWagered) continue;
      
      try {
        await instance2.connect(currentPlayer).wager({ value: wagerLimit });
        await ethers.provider.send("evm_mine", []);
        
        const balBefore = await ethers.provider.getBalance(currentPlayer.address);
        const playTx = await instance2.connect(currentPlayer).play();
        const playReceipt = await playTx.wait();
        const playGasCost = playReceipt.gasUsed * playReceipt.gasPrice;
        const balAfter = await ethers.provider.getBalance(currentPlayer.address);
        
        // If balance increased significantly (more than gas), they won
        if (balAfter > balBefore + playGasCost) {
          winCount++;
        }
      } catch {
        continue;
      }
    }
    
    // In original with difficulty=100, expected wins ~0-2 out of 50
    // In mutant, expected wins ~25-30 out of 50
    // If winCount > 10, mutant is almost certainly active
    expect(winCount).to.be.lessThan(10);
  });
});