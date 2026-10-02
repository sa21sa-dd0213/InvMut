import { expect } from "chai";
import { ethers } } from "hardhat";

describe("GSPFunding mutant test - mcb32af2e", function () {
    it("should kill mutant by calling buyShares with valid base input and expecting success", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy GSPFunding - note: this contract inherits from GSPStorage which doesn't have a constructor
        // The contract is abstract and requires implementation of certain state variables
        const Factory = await ethers.getContractFactory("GSPFunding");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Setup: Deploy mock ERC20 tokens for base and quote
        const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
        const baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
        const quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
        await baseToken.waitForDeployment();
        await quoteToken.waitForDeployment();
        
        // Initialize the GSP contract with tokens and parameters
        // First set the token addresses
        await instance.connect(owner)._setBaseToken(baseToken.target);
        await instance.connect(owner)._setQuoteToken(quoteToken.target);
        
        // Set initial reserves and targets
        const initialBase = ethers.parseEther("1000");
        const initialQuote = ethers.parseEther("1000");
        
        // Transfer tokens to the contract
        await baseToken.transfer(instance.target, initialBase);
        await quoteToken.transfer(instance.target, initialQuote);
        
        // Set initial state via the storage functions
        await instance.connect(owner)._setReserve(initialBase, initialQuote);
        await instance.connect(owner)._setTarget(initialBase, initialQuote);
        
        // Set price I and K
        await instance.connect(owner)._setI(ethers.parseEther("1"));
        await instance.connect(owner)._setK(ethers.parseEther("0.5"));
        
        // Now transfer additional base tokens to the contract to create baseInput
        const additionalBase = ethers.parseEther("10");
        await baseToken.transfer(instance.target, additionalBase);
        
        // This call should succeed in the original but fail in the mutant
        // because the mutant checks baseInput < 0 (always false for uint256)
        await expect(
            instance.connect(addr1).buyShares(addr1.address)
        ).to.not.be.reverted;
        
        // Verify that shares were minted (additional assertion)
        const shares = await instance.balanceOf(addr1.address);
        expect(shares).to.be.gt(0);
    });
});