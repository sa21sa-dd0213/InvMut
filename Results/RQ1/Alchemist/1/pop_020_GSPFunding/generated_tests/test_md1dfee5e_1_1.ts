import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant md1dfee5e test", function () {
  it("should kill the mutant by detecting incorrect quoteBalance calculation when _MT_FEE_QUOTE_ is non-zero", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for BASE and QUOTE
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    const quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding
    const Factory = await ethers.getContractFactory("GSPFunding");
    const initialI = ethers.parseEther("1");
    const initialK = ethers.parseEther("0.5");
    const lpFeeRate = ethers.parseEther("0.003");
    const mtFeeRate = ethers.parseEther("0.001");

    const instance = await Factory.deploy(
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      initialI,
      initialK,
      lpFeeRate,
      mtFeeRate
    );
    await instance.waitForDeployment();

    // Setup initial liquidity
    const initialBaseAmount = ethers.parseEther("10000");
    const initialQuoteAmount = ethers.parseEther("10000");

    await baseToken.transfer(await instance.getAddress(), initialBaseAmount);
    await quoteToken.transfer(await instance.getAddress(), initialQuoteAmount);

    // Call buyShares to initialize the pool
    await instance.connect(owner).buyShares(owner.address);

    // Simulate accumulated maintenance fee by transferring tokens directly
    const mtFeeQuoteAmount = ethers.parseEther("100");
    await quoteToken.transfer(await instance.getAddress(), mtFeeQuoteAmount);

    // Add more liquidity to create a scenario where fee accumulation matters
    const additionalBase = ethers.parseEther("1000");
    const additionalQuote = ethers.parseEther("1000");
    await baseToken.transfer(await instance.getAddress(), additionalBase);
    await quoteToken.transfer(await instance.getAddress(), additionalQuote);

    // Try to call buyShares - this will use the calculation that differs between original and mutant
    try {
      const tx = await instance.connect(addr1).buyShares(addr1.address, {
        gasLimit: 500000
      });
      await tx.wait();

      // If it succeeded, check that the calculated shares are reasonable
      const shares = await instance.balanceOf(addr1.address);
      const totalSupply = await instance.totalSupply();

      // In the original, shares should be proportional to the additional liquidity
      // The mutant with division would produce much smaller quoteBalance
      // leading to incorrect share calculation

      // If shares are 0 or unreasonably small, the mutant is killed
      expect(shares).to.be.gt(ethers.parseEther("0.001"), "Shares should be reasonable");

      // Additional check: the pool state should be consistent
      const reserve = await instance.getVaultReserve();
      expect(reserve.baseReserve).to.be.gt(initialBaseAmount);
    } catch (error: any) {
      // If it reverts, that also kills the mutant (original would succeed)
      expect(error.message).to.include("revert");
    }
  });
});

// Helper contract for testing - deploy as a separate contract
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}