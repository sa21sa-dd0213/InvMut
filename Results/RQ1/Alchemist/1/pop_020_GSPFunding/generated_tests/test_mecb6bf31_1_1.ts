import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant mecb6bf31 - Reentrancy in buyShares", function () {
    let owner: any;
    let attacker: any;
    let baseToken: any;
    let quoteToken: any;
    let gspFunding: any;
    
    // Malicious contract to perform reentrancy attack
    let attackerContract: any;

    beforeEach(async function () {
        [owner, attacker] = await ethers.getSigners();

        // Deploy mock ERC20 tokens for base and quote
        const ERC20Factory = await ethers.getContractFactory("MockERC20");
        baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
        quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
        await baseToken.waitForDeployment();
        await quoteToken.waitForDeployment();

        // Deploy GSPFunding - note: constructor expects no arguments based on contract code
        const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
        gspFunding = await GSPFundingFactory.deploy();
        await gspFunding.waitForDeployment();

        // Initialize the contract with required parameters
        // Set maintainer
        await gspFunding.connect(owner).adjustMtFeeRate(0);
        await gspFunding.connect(owner).adjustPrice(ethers.parseEther("1"));
        
        // Fund the contract with initial liquidity
        await baseToken.transfer(await gspFunding.getAddress(), ethers.parseEther("1000"));
        await quoteToken.transfer(await gspFunding.getAddress(), ethers.parseEther("1000"));

        // Deploy attacker contract that will reenter buyShares
        const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
        attackerContract = await AttackerFactory.deploy(
            await gspFunding.getAddress(),
            await baseToken.getAddress(),
            await quoteToken.getAddress()
        );
        await attackerContract.waitForDeployment();
    });

    it("should revert when reentrancy is attempted on buyShares", async function () {
        // Fund attacker contract with tokens
        await baseToken.transfer(await attackerContract.getAddress(), ethers.parseEther("100"));
        await quoteToken.transfer(await attackerContract.getAddress(), ethers.parseEther("100"));

        // Approve attacker contract to spend tokens on behalf of itself
        await baseToken.connect(attacker).approve(await attackerContract.getAddress(), ethers.parseEther("100"));
        await quoteToken.connect(attacker).approve(await attackerContract.getAddress(), ethers.parseEther("100"));

        // Call the attack function which will attempt reentrancy
        // The original contract with nonReentrant should revert
        // The mutant without nonReentrant should succeed (which we expect to fail this test)
        await expect(
            attackerContract.connect(attacker).attack()
        ).to.be.revertedWith("ReentrancyGuard: reentrant call");
    });
});