import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test", function () {
  it("should kill mutant md86c1c62 by detecting exponentiation instead of multiplication in balanceOfToken", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock savings contract that returns controlled values
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Set up a scenario: addr1 has imBalances = 2, exchangeRate = 3
    // We need to directly set imBalances for addr1 (onlyOwner can't, but we can simulate via supplyTokenTo)
    // First, get the mAsset address from the deployed contract
    const mAssetAddress = await instance.depositToken();
    
    // We need to mint tokens to owner to supply to addr1
    // Since we can't mint, we'll use a different approach: directly set storage via ethers provider
    // Or better: deploy a minimal ERC20 that the mock savings will use
    // Actually, let's use the mock savings that returns predictable values
    
    // Set exchangeRate to 3 in mock savings
    await mockSavings.setExchangeRate(3);
    
    // Get the mAsset token from the mock savings underlying()
    const mAsset = await ethers.getContractAt("IERC20", await mockSavings.underlying());
    
    // Mint tokens to owner (if mock ERC20 has mint function)
    await mAsset.mint(owner.address, ethers.parseEther("100"));
    
    // Approve MStableYieldSource to spend tokens
    await mAsset.approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Supply 2 tokens to addr1 (this will set imBalances[addr1] = 2 in credits)
    await instance.connect(owner).supplyTokenTo(2, addr1.address);
    
    // Now call balanceOfToken for addr1
    // Original: (2 * 3) / 1e18 = 6 / 1e18 = 6
    // Mutant:   (2 ** 3) / 1e18 = 8 / 1e18 = 8
    const balance = await instance.balanceOfToken(addr1.address);
    
    // The expected result with original code is 6 (2 * 3 / 1e18 = 6e-18 but as uint256)
    // Actually the division by 1e18 means we expect the result to be 0 for small numbers
    // Let's use larger numbers to get a meaningful difference
    
    // Better test: supply large amount so multiplication gives different result than exponentiation
    // Let's redo with amount = 10 and exchangeRate = 2
    await mockSavings.setExchangeRate(2);
    
    // Supply 10 tokens to another user
    await instance.connect(owner).supplyTokenTo(10, addr1.address);
    
    const balance2 = await instance.balanceOfToken(addr1.address);
    
    // Original: (10 * 2) / 1e18 = 20 / 1e18 = 0 (since integer division)
    // Mutant:   (10 ** 2) / 1e18 = 100 / 1e18 = 0
    // Both give 0 - need larger numbers
    
    // Let's use exchangeRate = 1e18 and imBalances = 2
    await mockSavings.setExchangeRate(ethers.parseEther("1"));
    
    // Deploy new instance with fresh state
    const instance2 = await Factory.deploy(await mockSavings.getAddress());
    await instance2.waitForDeployment();
    
    const mAsset2 = await ethers.getContractAt("IERC20", await mockSavings.underlying());
    await mAsset2.mint(owner.address, ethers.parseEther("1000"));
    await mAsset2.approve(await instance2.getAddress(), ethers.parseEther("1000"));
    
    // Supply 2 tokens to addr1
    await instance2.connect(owner).supplyTokenTo(2, addr1.address);
    
    // Now exchangeRate = 1e18 (parseEther("1"))
    // Original: (2 * 1e18) / 1e18 = 2
    // Mutant:   (2 ** 1e18) / 1e18 = astronomically large (overflow or huge number)
    const balance3 = await instance2.balanceOfToken(addr1.address);
    
    // The mutant will produce an extremely large number or overflow
    // The original will produce exactly 2
    expect(balance3).to.equal(2);
  });
});