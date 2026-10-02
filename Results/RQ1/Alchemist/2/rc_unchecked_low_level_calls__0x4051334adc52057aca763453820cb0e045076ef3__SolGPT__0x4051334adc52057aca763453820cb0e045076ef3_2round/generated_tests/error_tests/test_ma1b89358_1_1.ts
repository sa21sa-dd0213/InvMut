import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant ma1b89358", function () {
  it("should revert when transferFrom fails due to insufficient balance, but mutant incorrectly returns true", async function () {
    const [owner, from, recipient] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing (using a basic ERC20 implementation)
    const ERC20 = await ethers.getContractFactory("contracts/test/ERC20.sol:ERC20");
    const token = await ERC20.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Deploy the airdrop contract (no constructor args)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Mint some tokens to 'from' address
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    
    // Have 'from' approve the airdrop contract to spend tokens
    await token.connect(from).approve(await airdrop.getAddress(), mintAmount);
    
    // Now call airdrop.transfer with an amount greater than the balance (to cause failure)
    const recipients = [recipient.address];
    const excessiveAmount = ethers.parseEther("200"); // more than 100 balance
    
    // The original contract would revert due to require(_s) checking the failed call
    // The mutant should NOT revert (killing the mutant)
    await expect(
      airdrop.connect(owner).transfer(
        from.address,
        await token.getAddress(),
        recipients,
        excessiveAmount
      )
    ).to.be.reverted; // This will pass on original, fail on mutant (mutant returns without revert)
  });
});