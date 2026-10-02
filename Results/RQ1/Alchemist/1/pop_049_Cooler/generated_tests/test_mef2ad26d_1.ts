import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mef2ad26d - setDirectRepay authorization", function () {
  let coolerFactory: any;
  let coolerImplementation: any;
  let cooler: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let collateralToken: any;
  let debtToken: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy the CoolerFactory
    const Factory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await Factory.deploy();
    await coolerFactory.waitForDeployment();

    // Generate a cooler for owner
    await coolerFactory.connect(owner).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );

    // Get the cooler address
    const coolersFor = await coolerFactory.coolersFor(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    const coolerAddress = coolersFor[0];
    cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: Create a loan to have a lender
    // First, owner makes a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("10");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 86400; // 1 day

    await collateralToken.connect(owner).approve(
      await cooler.getAddress(),
      ethers.parseEther("50")
    );
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // addr1 clears the request (becomes lender)
    await debtToken.connect(addr1).approve(
      await cooler.getAddress(),
      amount
    );
    await cooler.connect(addr1).clearRequest(0, false, false);
  });

  it("should revert when a non-lender with lower address calls setDirectRepay", async function () {
    // Get the lender address (addr1)
    const loan = await cooler.getLoan(0);
    const lender = loan.lender;

    // Verify addr1 is the lender
    expect(lender).to.equal(addr1.address);

    // addr2 has a higher address than addr1 (typically)
    // But to ensure we have a lower address, we can check
    // If addr2 > addr1, we need to find a signer with lower address
    // Use ethers.Wallet to create a deterministic address that is lower
    const wallet = ethers.Wallet.createRandom();
    const lowerAddress = wallet.address;

    // Fund the wallet to pay for gas
    await owner.sendTransaction({
      to: lowerAddress,
      value: ethers.parseEther("1")
    });

    // Get signer for this address
    const lowerSigner = await ethers.getImpersonatedSigner(lowerAddress);

    // This should revert on original (msg.sender != lender)
    // On mutant (msg.sender <= lender), it would pass for lower addresses
    await expect(
      cooler.connect(lowerSigner).setDirectRepay(0, true)
    ).to.be.revertedWith("OnlyApproved");
  });
});