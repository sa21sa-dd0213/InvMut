import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant mdcaa9d93 - asset set to address(0)", function () {
  it("should revert when calling requestDepositWithPermit because asset is address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock ERC20 with permit functionality for testing
    const MockERC20Permit = await ethers.getContractFactory("MockERC20Permit");
    const mockAsset = await MockERC20Permit.deploy("Test Asset", "TST", 18);
    await mockAsset.waitForDeployment();
    
    // Deploy mock TrancheTokenLike
    const MockTrancheToken = await ethers.getContractFactory("MockTrancheToken");
    const mockShare = await MockTrancheToken.deploy("Test Share", "SHR", 18);
    await mockShare.waitForDeployment();
    
    // Deploy mock InvestmentManagerLike
    const MockInvestmentManager = await ethers.getContractFactory("MockInvestmentManager");
    const mockInvestmentManager = await MockInvestmentManager.deploy();
    await mockInvestmentManager.waitForDeployment();
    
    // Deploy LiquidityPool with the required constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("test-tranche");
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPool.deploy(
      poolId,
      trancheId,
      await mockAsset.getAddress(),
      await mockShare.getAddress(),
      await mockInvestmentManager.getAddress()
    );
    await liquidityPool.waitForDeployment();
    
    // Get the actual deployed asset address from the contract
    const actualAsset = await liquidityPool.asset();
    
    // Verify the mutant sets asset to address(0)
    expect(actualAsset).to.equal(ethers.ZeroAddress);
    
    // Prepare permit parameters
    const deadline = ethers.MaxUint256;
    const value = ethers.parseEther("100");
    
    // Get the permit nonce for addr1 from the mock asset
    const nonce = await mockAsset.nonces(addr1.address);
    
    // Create the permit digest
    const domain = {
      name: await mockAsset.name(),
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await mockAsset.getAddress()
    };
    
    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
      ]
    };
    
    const values = {
      owner: addr1.address,
      spender: await mockInvestmentManager.getAddress(),
      value: value,
      nonce: nonce,
      deadline: deadline
    };
    
    // Sign the permit
    const signature = await addr1.signTypedData(domain, types, values);
    const { v, r, s } = ethers.Signature.from(signature);
    
    // Attempt to call requestDepositWithPermit - this should revert because asset is address(0)
    await expect(
      liquidityPool.connect(addr1).requestDepositWithPermit(
        value,
        addr1.address,
        deadline,
        v,
        r,
        s
      )
    ).to.be.reverted;
  });
});