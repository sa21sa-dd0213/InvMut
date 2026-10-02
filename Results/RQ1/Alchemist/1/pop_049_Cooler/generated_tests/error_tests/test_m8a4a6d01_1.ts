import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m8a4a6d01 - rollLoan timestamp boundary", function () {
  let coolerFactory: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let collateralToken: any;
  let debtToken: any;

  beforeEach(async function () {
    [owner, lender] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    collateralToken = await ERC20Mock.deploy("Collateral", "COL", 18);
    debtToken = await ERC20Mock.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Generate a cooler for owner
    const tx = await coolerFactory.connect(owner).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    const receipt = await tx.wait();

    // Get the cooler address from the event or mapping
    const coolerAddress = await coolerFactory.coolersFor(
      await collateralToken.getAddress(),
      await debtToken.getAddress(),
      0
    );
    cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Mint tokens to owner and lender
    const mintAmount = ethers.parseEther("1000");
    await collateralToken.mint(owner.address, mintAmount);
    await debtToken.mint(lender.address, mintAmount);
    await collateralToken.connect(owner).approve(await cooler.getAddress(), mintAmount);
    await debtToken.connect(lender).approve(await cooler.getAddress(), mintAmount);
  });

  it("should allow rollLoan at exact expiry timestamp (original behavior) and fail on mutant", async function () {
    // Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10% annual
    const loanToCollateral = ethers.parseEther("2"); // 200% collateralization
    const duration = 7 * 24 * 60 * 60; // 7 days

    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await cooler.connect(lender).clearRequest(0, false, false);

    // Get the loan expiry
    const loan = await cooler.getLoan(0);
    const expiry = loan.expiry;

    // Advance time to exactly the expiry timestamp
    const currentTime = await ethers.provider.getBlock("latest").then(b => b!.timestamp);
    const timeToAdvance = Number(expiry) - currentTime;
    
    if (timeToAdvance > 0) {
      await ethers.provider.send("evm_increaseTime", [timeToAdvance]);
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we're at exactly the expiry time
    const blockAfter = await ethers.provider.getBlock("latest");
    expect(blockAfter!.timestamp).to.equal(Number(expiry));

    // Owner should be able to roll the loan at exactly the expiry timestamp
    // Mutant will revert with "Default" because it uses >= instead of >
    await expect(cooler.connect(owner).rollLoan(0)).to.not.be.reverted;
  });
});