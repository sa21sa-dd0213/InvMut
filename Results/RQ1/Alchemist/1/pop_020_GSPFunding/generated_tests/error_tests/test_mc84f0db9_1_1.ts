import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant test for mc84f0db9", function () {
  it("should detect mutant that changes shares > 2001 to shares < 2001 in buyShares", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for BASE and QUOTE
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const baseToken = await MockERC20.deploy("Base", "BASE", 18);
    const quoteToken = await MockERC20.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding (no constructor arguments needed as per contract)
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the GSPFunding contract
    // Set BASE_TOKEN and QUOTE_TOKEN
    await instance.setBaseToken(await baseToken.getAddress());
    await instance.setQuoteToken(await quoteToken.getAddress());

    // Mint tokens to addr1 for initial liquidity
    const depositAmount = ethers.parseEther("10000");
    await baseToken.mint(addr1.address, depositAmount);
    await quoteToken.mint(addr1.address, depositAmount);

    // Approve GSPFunding contract to spend tokens
    await baseToken.connect(addr1).approve(await instance.getAddress(), depositAmount);
    await quoteToken.connect(addr1).approve(await instance.getAddress(), depositAmount);

    // Set initial I price to 1 (equal ratio)
    await instance.setI(ethers.parseEther("1"));

    // Transfer tokens to GSPFunding to simulate initial deposits
    await baseToken.connect(addr1).transfer(await instance.getAddress(), depositAmount);
    await quoteToken.connect(addr1).transfer(await instance.getAddress(), depositAmount);

    // Call buyShares - this should calculate shares = 10000 (since baseBalance = quoteBalance = 10000)
    // Original: require(shares > 2001) - this should pass with shares = 10000
    // Mutant: require(shares < 2001) - this should revert since 10000 < 2001 is false

    await expect(
      instance.connect(addr1).buyShares(addr1.address)
    ).to.not.be.reverted;

    // Verify that shares were minted successfully
    const shares = await instance.balanceOf(addr1.address);
    expect(shares).to.be.gt(2001); // Shares should be much greater than 2001

    // Verify total supply is updated
    const totalSupply = await instance.totalSupply();
    expect(totalSupply).to.be.gt(2001);
  });
});