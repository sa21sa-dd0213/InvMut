import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant detection - exponentiation vs multiplication", function () {
  it("should detect mutant that replaces ** with * by checking transferred amount", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy a simple ERC20-like token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to the 'from' address and approve the airDrop contract
    const mintAmount = ethers.parseEther("1000");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(owner.address, mintAmount); // owner will call airDrop
    
    // Deploy the airDrop contract (no constructor arguments needed)
    const AirDropFactory = await ethers.getContractFactory("airDrop");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();
    
    // Setup: v = 1, _decimals = 2 => original: 1 * 10^2 = 100, mutant: 1 * 10 * 2 = 20
    const v = 1;
    const decimals = 2;
    const recipients = [to.address];
    
    // Get balances before
    const balanceBefore = await token.balanceOf(to.address);
    
    // Execute the transfer
    const tx = await airDrop.transfer(
      from.address,
      await token.getAddress(),
      recipients,
      v,
      decimals
    );
    await tx.wait();
    
    // Get balance after
    const balanceAfter = await token.balanceOf(to.address);
    
    // Original should transfer 100 wei (1 * 10^2 = 100)
    // Mutant would transfer 20 wei (1 * 10 * 2 = 20)
    // Assert the correct amount from the original calculation
    const expectedTransfer = BigInt(v) * BigInt(10 ** decimals); // 100
    expect(balanceAfter - balanceBefore).to.equal(expectedTransfer);
  });
});