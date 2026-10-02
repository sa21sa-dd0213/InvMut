import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m053469e8 - _transfer >= replaced with <=", function () {
  it("should revert when transferring tokens to an address with existing balance (detects mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = ethers.parseUnits("1000", 0);
    const instance = await Factory.deploy(initialSupply, "TestToken", "TTK");
    await instance.waitForDeployment();

    // Give addr1 some initial balance by minting
    await instance.mintToken(addr1.address, ethers.parseUnits("100", 0));

    // Transfer a positive amount from owner to addr1 (who already has balance)
    const transferAmount = ethers.parseUnits("50", 0);
    
    // In the original: balanceOf[addr1] + transferAmount >= balanceOf[addr1] is true (150 >= 100)
    // In the mutant:  balanceOf[addr1] + transferAmount <= balanceOf[addr1] is false (150 <= 100)
    // Therefore the mutant should revert
    await expect(
      instance.transfer(addr1.address, transferAmount)
    ).to.be.reverted;
  });
});