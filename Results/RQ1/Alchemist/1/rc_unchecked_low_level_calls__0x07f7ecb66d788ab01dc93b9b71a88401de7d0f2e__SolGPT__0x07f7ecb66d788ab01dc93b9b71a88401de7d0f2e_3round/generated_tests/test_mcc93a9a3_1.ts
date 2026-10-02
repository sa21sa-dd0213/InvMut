import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mcc93a9a3 test", function () {
  it("should detect missing require(_s) in loseWager by using a whale contract that rejects ETH", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy a contract that will act as the whale and reject ETH
    const RejectingWhaleFactory = await ethers.getContractFactory("RejectingWhale");
    const rejectingWhale = await RejectingWhaleFactory.deploy();
    await rejectingWhale.waitForDeployment();
    
    const betLimit = ethers.parseEther("1.0");
    
    // Deploy PoCGame with the rejecting whale address
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(await rejectingWhale.getAddress(), betLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await instance.connect(owner).OpenToThePublic();
    
    // Set difficulty to 2 so that the winning condition is difficulty/2 = 1
    // For any random number, if it's not 1, the player loses
    await instance.connect(owner).AdjustDifficulty(2);
    
    // Player makes a wager
    await instance.connect(player).wager({ value: betLimit });
    
    // Mine a block to advance block.number so that play() can execute
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to play - this should trigger loseWager which sends ETH to the rejecting whale
    // In the mutant, the require(_s) is removed so the transaction won't revert
    // In the original, it would revert because the whale rejects ETH
    // The test expects the mutant to NOT revert (since require is missing)
    await expect(
      instance.connect(player).play()
    ).to.not.be.reverted;
    
    // Additional verification: the player's wager should be cleared even though transfer failed
    expect(await instance.hasPlayerWagered(player.address)).to.be.false;
  });
});

// Helper contract that rejects all incoming ETH
contract RejectingWhale {
  receive() external payable {
    revert("This contract rejects ETH");
  }
}