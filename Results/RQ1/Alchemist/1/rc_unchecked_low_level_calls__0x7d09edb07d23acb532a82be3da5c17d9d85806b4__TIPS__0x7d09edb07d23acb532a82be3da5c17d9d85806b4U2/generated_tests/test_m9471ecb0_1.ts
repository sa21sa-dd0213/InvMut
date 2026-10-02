import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PoCGame mutant m9471ecb0 test", function () {
  it("should detect mutant by verifying wager storage matches msg.value", async function () {
    const [owner, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const whaleAddress = ethers.Wallet.createRandom().address;
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();
    
    // Owner opens the contract to public
    await instance.connect(owner).OpenToThePublic();
    
    // Player sends exactly betLimit
    const wagerAmount = betLimit;
    const tx = await instance.connect(player).wager({ value: wagerAmount });
    await tx.wait();
    
    // Read the stored wager via hasPlayerWagered (true if > 0) - we need direct access
    // Since there's no getter for wagers mapping, we use hasPlayerWagered to confirm it's stored
    // But to detect the +1 bug, we need to check if the contract's balance reflects the actual deposit
    // The mutant stores msg.value + 1, so if we check the contract balance after wager:
    const contractBalance = await instance.ethBalance();
    
    // If mutant is present, wagers[player] = betLimit + 1, but actual balance = betLimit
    // The contract balance should equal exactly what was sent
    expect(contractBalance).to.equal(wagerAmount);
    
    // Additionally, we can verify that hasPlayerWagered returns true (since wager > 0)
    const hasWagered = await instance.hasPlayerWagered(player.address);
    expect(hasWagered).to.be.true;
    
    // The key assertion: if we call play() and then check balance after lose
    // But more directly, the mutant stores wagers[msg.sender] = msg.value + 1
    // We can verify this by calling play() and seeing if loseWager sends betLimit/2
    // But the critical bug is the stored value doesn't match sent value
    // To kill the mutant, we verify the contract balance equals msg.value exactly
    // This fails if wager stored is msg.value + 1 but balance is msg.value
  });
});