import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - meff4d0f2", function () {
    it("should kill the mutant by showing that adding MT_FEE_QUOTE_ instead of subtracting it causes a revert due to insufficient balance", async function () {
        const [owner, user] = await ethers.getSigners();
        
        // Deploy the contract
        const Factory = await ethers.getContractFactory("GSPFunding");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Setup mock tokens
        const TokenFactory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
        const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
        const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
        await baseToken.waitForDeployment();
        await quoteToken.waitForDeployment();

        // Get the maintainer address
        const maintainer = await instance._MAINTAINER_();

        // First, let's set up the contract with proper state by calling buyShares
        // Mint tokens to user for initial liquidity
        await baseToken.mint(user.address, ethers.parseEther("1000"));
        await quoteToken.mint(user.address, ethers.parseEther("1000"));

        // User approves contract to spend tokens
        await baseToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("1000"));
        await quoteToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("1000"));

        // Transfer tokens to contract to create initial reserves
        await baseToken.connect(user).transfer(await instance.getAddress(), ethers.parseEther("500"));
        await quoteToken.connect(user).transfer(await instance.getAddress(), ethers.parseEther("500"));

        // Call buyShares to initialize the contract and create shares
        await instance.connect(user).buyShares(user.address);

        // Now set _MT_FEE_QUOTE_ to a non-zero value via storage manipulation
        // Storage slot for _MT_FEE_QUOTE_ (slot 32 based on the contract layout)
        await ethers.provider.send("hardhat_setStorageAt", [
            await instance.getAddress(),
            "0x20", // slot 32
            ethers.zeroPadValue(ethers.toBeHex(ethers.parseEther("10")), 32)
        ]);

        // Now try to call sellShares - it should revert because the mutant
        // adds _MT_FEE_QUOTE_ to the balance, inflating the quoteAmount
        await expect(
            instance.connect(user).sellShares(
                ethers.parseEther("10"),
                user.address,
                0,
                0,
                "0x",
                9999999999
            )
        ).to.be.reverted;

        // This test kills the mutant because:
        // Original: quoteBalance = balanceOf(this) - _MT_FEE_QUOTE_ -> correct calculation
        // Mutant: quoteBalance = balanceOf(this) + _MT_FEE_QUOTE_ -> inflated amount
        // The inflated amount causes the transfer to fail when _MT_FEE_QUOTE_ > 0
    });
});