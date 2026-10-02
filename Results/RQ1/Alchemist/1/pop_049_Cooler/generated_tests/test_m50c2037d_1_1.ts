import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m50c2037d - rescindRequest access control", function () {
  it("should revert when unauthorized user with lower address calls rescindRequest", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy CoolerFactory first (needed to create Cooler instances)
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Get the cooler implementation address
    const coolerImpl = await factory.coolerImplementation();
    
    // Create a cooler for the owner
    // Need mock ERC20 tokens for collateral and debt
    const MockERC20 = await ethers.getContractFactory("ERC20");
    
    // Deploy mock tokens with required constructor args
    const collateral = await MockERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await MockERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate cooler for owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address for this combination
    const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersFor[0];
    
    // Get the cooler contract instance
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);

    // Create a loan request first (needed to have something to rescind)
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("10");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 7 * 24 * 60 * 60; // 7 days
    
    // Transfer collateral to owner first
    await collateral.connect(owner).approve(coolerAddress, amount);
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Find an unauthorized user with numerically lower address than owner
    // We'll use addr1 - need to ensure it's numerically lower
    // If not, we'll use the address with the lowest value among signers
    let attacker = addr1;
    if (attacker.address >= owner.address) {
      attacker = addr2;
    }
    
    // Ensure attacker is still numerically lower than owner
    // If not, deploy a new wallet with a lower address
    if (attacker.address >= owner.address) {
      const newWallet = ethers.Wallet.createRandom();
      attacker = newWallet.connect(ethers.provider);
    }

    // Attempt to rescind request from unauthorized user with lower address
    // This should revert on original (correct behavior)
    // But will succeed on mutant (incorrect behavior)
    await expect(
      cooler.connect(attacker).rescindRequest(0)
    ).to.be.revertedWith("OnlyApproved");
  });
});