import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant me8318676 test", function () {
  it("should detect the mutant by verifying total supply matches deployer balance after construction", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy with mock router and USD token addresses
    const MockFactory = await ethers.getContractFactory("MockUniswapV2Router02");
    const mockRouter = await MockFactory.deploy();
    await mockRouter.waitForDeployment();

    const MockUSD = await ethers.getContractFactory("MockERC20");
    const mockUSD = await MockUSD.deploy();
    await mockUSD.waitForDeployment();

    const ANCHTokenFactory = await ethers.getContractFactory("ANCHToken");
    const instance = await ANCHTokenFactory.deploy(
      await mockRouter.getAddress(),
      await mockUSD.getAddress()
    );
    await instance.waitForDeployment();

    // Get the total supply
    const totalSupply = await instance.totalSupply();

    // Get the deployer's balance
    const deployerBalance = await instance.balanceOf(owner.address);

    // In the original contract, deployer balance should equal total supply
    // In the mutant, the incorrect _rTotal calculation causes balanceOf to return a different value
    expect(deployerBalance).to.equal(totalSupply);
  });
});

// Helper contracts for deployment
contract MockERC20 {
    string public name = "MockUSD";
    string public symbol = "mUSD";
    uint8 public decimals = 18;
    uint256 public totalSupply = 1000000 * 10**18;
    mapping(address => uint256) public balanceOf;

    constructor() {
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) { return true; }
    function allowance(address owner, address spender) external view returns (uint256) { return 0; }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) { return true; }
}

contract MockUniswapV2Router02 {
    function factory() external pure returns (address) { return address(0); }
    function WETH() external pure returns (address) { return address(0); }
    function addLiquidity(address, address, uint256, uint256, uint256, uint256, address, uint256) external returns (uint256, uint256, uint256) { return (0,0,0); }
    function addLiquidityETH(address, uint256, uint256, uint256, address, uint256) external payable returns (uint256, uint256, uint256) { return (0,0,0); }
    function removeLiquidity(address, address, uint256, uint256, uint256, address, uint256) external returns (uint256, uint256) { return (0,0); }
    function removeLiquidityETH(address, uint256, uint256, uint256, address, uint256) external returns (uint256, uint256) { return (0,0); }
    function removeLiquidityWithPermit(address, address, uint256, uint256, uint256, address, uint256, bool, uint8, bytes32, bytes32) external returns (uint256, uint256) { return (0,0); }
    function removeLiquidityETHWithPermit(address, uint256, uint256, uint256, address, uint256, bool, uint8, bytes32, bytes32) external returns (uint256, uint256) { return (0,0); }
    function swapExactTokensForTokens(uint256, uint256, address[] calldata, address, uint256) external returns (uint256[] memory) { return new uint256[](0); }
    function swapTokensForExactTokens(uint256, uint256, address[] calldata, address, uint256) external returns (uint256[] memory) { return new uint256[](0); }
    function swapExactETHForTokens(uint256, address[] calldata, address, uint256) external payable returns (uint256[] memory) { return new uint256[](0); }
    function swapTokensForExactETH(uint256, uint256, address[] calldata, address, uint256) external returns (uint256[] memory) { return new uint256[](0); }
    function swapExactTokensForETH(uint256, uint256, address[] calldata, address, uint256) external returns (uint256[] memory) { return new uint256[](0); }
    function swapETHForExactTokens(uint256, address[] calldata, address, uint256) external payable returns (uint256[] memory) { return new uint256[](0); }
    function quote(uint256, uint256, uint256) external pure returns (uint256) { return 0; }
    function getAmountOut(uint256, uint256, uint256) external pure returns (uint256) { return 0; }
    function getAmountIn(uint256, uint256, uint256) external pure returns (uint256) { return 0; }
    function getAmountsOut(uint256, address[] calldata) external view returns (uint256[] memory) { return new uint256[](0); }
    function getAmountsIn(uint256, address[] calldata) external view returns (uint256[] memory) { return new uint256[](0); }
    function removeLiquidityETHSupportingFeeOnTransferTokens(address, uint256, uint256, uint256, address, uint256) external returns (uint256) { return 0; }
    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(address, uint256, uint256, uint256, address, uint256, bool, uint8, bytes32, bytes32) external returns (uint256) { return 0; }
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256, uint256, address[] calldata, address, uint256) external {}
    function swapExactETHForTokensSupportingFeeOnTransferTokens(uint256, address[] calldata, address, uint256) external payable {}
    function swapExactTokensForETHSupportingFeeOnTransferTokens(uint256, uint256, address[] calldata, address, uint256) external {}
}