import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m71efebc9 test", function () {
  it("should kill mutant by testing initial buyShares with totalSupply == 0", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy GSPFunding - note: this contract has no constructor arguments
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the deployed contract address
    const contractAddress = await instance.getAddress();

    // Deploy mock ERC20 tokens for base and quote
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    const quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();

    const baseTokenAddress = await baseToken.getAddress();
    const quoteTokenAddress = await quoteToken.getAddress();

    // Initialize the pool with initial parameters
    // Set base and quote tokens
    await instance.connect(owner).setBaseToken(baseTokenAddress);
    await instance.connect(owner).setQuoteToken(quoteTokenAddress);

    // Set initial price I (1:1 ratio)
    await instance.connect(owner).setI(ethers.parseEther("1"));

    // Set K (0 for simplicity)
    await instance.connect(owner).setK(0);

    // Fund owner with tokens
    const mintAmount = ethers.parseEther("10000");
    await baseToken.mint(owner.address, mintAmount);
    await quoteToken.mint(owner.address, mintAmount);

    // Approve the GSPFunding contract to spend tokens
    await baseToken.connect(owner).approve(contractAddress, mintAmount);
    await quoteToken.connect(owner).approve(contractAddress, mintAmount);

    // Transfer initial liquidity to the contract (base and quote tokens)
    const baseInput = ethers.parseEther("1000");
    const quoteInput = ethers.parseEther("1000");
    await baseToken.transfer(contractAddress, baseInput);
    await quoteToken.transfer(contractAddress, quoteInput);

    // Call buyShares for the first time (totalSupply == 0)
    // This should initialize the pool with targets
    const tx = await instance.connect(owner).buyShares(addr1.address);
    const receipt = await tx.wait();

    // Get the PMM state to check targets
    const state = await instance.getPMMState();

    // In the original contract, after first buyShares:
    // - _BASE_TARGET_ should be set to shares amount (approximately baseInput)
    // - _QUOTE_TARGET_ should be set to shares * _I_
    // In the mutant, targets remain 0 because the initialization branch is skipped

    // The test should pass on original (targets > 0) and fail on mutant (targets == 0)
    expect(state.B0).to.be.gt(0);
    expect(state.Q0).to.be.gt(0);

    // Also verify that totalSupply increased (original mints shares, mutant fails)
    const totalSupply = await instance.totalSupply();
    expect(totalSupply).to.be.gt(0);
  });
});