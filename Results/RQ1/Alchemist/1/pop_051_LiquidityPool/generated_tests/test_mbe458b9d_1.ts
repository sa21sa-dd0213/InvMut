import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant test - requestDepositWithPermit event emission", function () {
  it("should emit DepositRequested event when requestDepositWithPermit is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock ERC20 token for asset
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const asset = await ERC20Factory.deploy("Asset", "AST", 18);
    await asset.waitForDeployment();
    
    // Deploy mock TrancheToken
    const TrancheTokenFactory = await ethers.getContractFactory("TrancheTokenMock");
    const share = await TrancheTokenFactory.deploy("Tranche", "TRN", 18);
    await share.waitForDeployment();
    
    // Deploy mock InvestmentManager
    const InvestmentManagerFactory = await ethers.getContractFactory("InvestmentManagerMock");
    const investmentManager = await InvestmentManagerFactory.deploy();
    await investmentManager.waitForDeployment();
    
    // Deploy LiquidityPool
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const instance = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      await asset.getAddress(),
      await share.getAddress(),
      await investmentManager.getAddress()
    );
    await instance.waitForDeployment();
    
    // Setup permit signature
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const assets = ethers.parseEther("100");
    
    // Get the permit signature
    const domain = {
      name: await asset.name(),
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await asset.getAddress()
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
    
    const nonce = await asset.nonces(addr1.address);
    const message = {
      owner: addr1.address,
      spender: await investmentManager.getAddress(),
      value: assets,
      nonce: nonce,
      deadline: deadline
    };
    
    const signature = await addr1.signTypedData(domain, types, message);
    const { v, r, s } = ethers.Signature.from(signature);
    
    // Test the event emission
    await expect(
      instance.connect(addr1).requestDepositWithPermit(
        assets,
        addr1.address,
        deadline,
        v,
        r,
        s
      )
    )
      .to.emit(instance, "DepositRequested")
      .withArgs(addr1.address, assets);
  });
});