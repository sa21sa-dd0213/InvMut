import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PoCGame mutant test - donate function", function () {
  it("should detect mutant that subtracts 1 wei from msg.value in donateToWhale call", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    
    // Deploy contract with whale address and bet limit
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();
    
    // Open contract to public
    await instance.connect(owner).OpenToThePublic();
    
    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    const initialWhaleBalance = await ethers.provider.getBalance(whale.address);
    
    // Donate exactly 1 ether
    const donationAmount = ethers.parseEther("1");
    const tx = await instance.connect(player).donate({ value: donationAmount });
    const receipt = await tx.wait();
    
    // Get final balances
    const finalContractBalance = await ethers.provider.getBalance(instance.target);
    const finalWhaleBalance = await ethers.provider.getBalance(whale.address);
    
    // Check that whale received exactly the donation amount (original behavior)
    // Mutant would send msg.value - 1 = 1 ether - 1 wei
    expect(finalWhaleBalance - initialWhaleBalance).to.equal(donationAmount);
    
    // Check that contract balance is zero after donation (no funds stuck)
    expect(finalContractBalance).to.equal(0);
    
    // Check the Donate event emitted the correct amount
    await expect(tx)
      .to.emit(instance, "Donate")
      .withArgs(donationAmount, whale.address, player.address);
  });
});